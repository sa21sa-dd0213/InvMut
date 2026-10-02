import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant detection - owner() function", function () {
  it("should return the correct owner address for a cloned Cooler contract", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the CoolerFactory which will create clones
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the Cooler implementation address from the factory
    const coolerImplAddress = await factory.coolerImplementation();

    // Create mock ERC20 tokens for testing
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner with these tokens
    const tx = await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const receipt = await tx.wait();

    // Get the cooler address from the coolersFor array
    const coolersList = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    
    // Ensure there is at least one cooler
    expect(coolersList.length).to.be.greaterThan(0);
    
    const coolerAddress = coolersList[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Get the owner from the cooler
    const coolerOwner = await cooler.owner();

    // The owner should be the address that generated the cooler
    expect(coolerOwner).to.equal(owner.address);
  });
});