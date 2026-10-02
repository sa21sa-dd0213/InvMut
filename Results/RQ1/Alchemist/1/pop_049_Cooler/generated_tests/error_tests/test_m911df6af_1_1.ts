import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m911df6af by calling delegateVoting from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Cooler with constructor arguments
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = await Cooler.deploy();
    await cooler.waitForDeployment();

    // The owner() function returns the owner from immutable args
    // For a freshly deployed Cooler without clone, we need to check owner
    // Since Cooler is abstract and uses Clone, we deploy through CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get mock ERC20 tokens for collateral and debt
    const ERC20Mock = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Mock.deploy("Collateral", "COLL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];

    // Attach to the deployed cooler
    const coolerInstance = await ethers.getContractAt("Cooler", coolerAddress);

    // Verify owner is the address that generated the cooler
    const coolerOwner = await coolerInstance.owner();
    expect(coolerOwner).to.equal(owner.address);

    // Call delegateVoting from owner - should succeed in original but revert in mutant
    // Using a zero address as target for simplicity
    await expect(
      coolerInstance.connect(owner).delegateVoting(ethers.ZeroAddress)
    ).to.not.be.reverted;
  });
});