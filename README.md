# spt-diffpatch

A customizable diff/patch tool for SPT-AKI releases >= 3.8.0

## Usage

`$spt-diffpatch [options] patch_file target_file`

### Syntax

```
$spt-diffpatch [options] original newfile
```

*Paramaters*

`original` - The existing file (potentially outdated).
`newfile` - An updated version of `original`

**Arguments**

Name | Flag | Description
--- | --- | ---
ignore | -N | Ignores absent files
verbose | -v | Remove verbose elements
column-mode | -y | Display output in columns, side-by-side
recursive | -r `pattern` | Compare all files in the directory matching a regex `pattern`
. | -u | Displays output in an easier to read format. This may remove some information such as context lines.


## Output

**Diff**

*To Create a .diff file*
```bash
diff -u file1 file2 > out_file.diff
```

- file1 - The target
- file2 - The source

**Patch**

*To Apply a patch*
```bash
patch < out_file.diff
```

*To Undo a patch*
```bash
patch -R < out_file.diff
```

**Notes**

- Uses linux `diff` and `patch`.
- Hunk is a term used by `diff` representing the raw bytes changed
