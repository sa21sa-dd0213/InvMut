import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m9c75dc6a - delegateVoting authorization", function () {
  it("should revert when unauthorized address with higher numeric value calls delegateVoting", async function () {
    // Deploy a mock ERC20 collateral token that implements IDelegate
    const MockDelegateToken = await ethers.getContractFactory("MockDelegateToken");
    const mockToken = await MockDelegateToken.deploy();
    await mockToken.waitForDeployment();

    // Deploy a mock ERC20 debt token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockDebt = await MockERC20.deploy("Debt", "DBT", 18);
    await mockDebt.waitForDeployment();

    // Deploy the CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get signers
    const [owner, attacker] = await ethers.getSigners();

    // Generate a cooler for the owner with the mock tokens
    await factory.connect(owner).generateCooler(mockToken.target, mockDebt.target);

    // Get the cooler address
    const coolerAddress = await factory.coolersFor(mockToken.target, mockDebt.target, 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Verify attacker has a higher numeric address than owner
    const ownerAddress = BigInt(owner.address);
    const attackerAddress = BigInt(attacker.address);
    expect(attackerAddress).to.be.greaterThan(ownerAddress, "Attacker address must be numerically greater than owner for this test");

    // Attempt to call delegateVoting from unauthorized address with higher numeric value
    await expect(
      cooler.connect(attacker).delegateVoting(attacker.address)
    ).to.be.revertedWith("OnlyApproved");
  });
});