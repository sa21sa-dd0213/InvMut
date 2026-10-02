from setuptools import setup, find_packages
from solTg import __version__

def read_requirements():
    with open('requirements.txt', 'r') as req:
        return req.read().splitlines()

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name='solTg',
    python_requires='>3.5.2',
    version=__version__,
    packages=find_packages(),
    include_package_data=True,  # This tells setuptools to include files listed in MANIFEST.in
    author = "Konstantin Britikov",
    author_email = "BritikovKI@Gmail.com",
    description = "Test generation for Solidity in Foundry format (https://github.com/foundry-rs/foundry).",
    long_description = long_description,
    long_description_content_type = "text/markdown",
    # If needed, specify explicit paths
    install_requires=read_requirements(),
    package_data={
        'my_package': ['./deps/*'],
    },
    # Or for distribution-wide resources
    data_files=[('deps', ['deps/tgnonlin', 'deps/tgnonlin_linux', 'deps/run_solcmc', 'deps/docker_solcmc_updated'])],
    entry_points={
        'console_scripts': [
            'solTg=solTg.RunAll:main',
        ],
    },
)
