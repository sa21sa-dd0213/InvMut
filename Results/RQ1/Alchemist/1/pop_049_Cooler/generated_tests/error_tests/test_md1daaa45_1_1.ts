import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant md1daaa45 - delegateVoting access control", function () {
  it("should allow owner to call delegateVoting and revert when non-owner calls", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Cooler contract - it uses Clone pattern, so we need to deploy via factory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Create mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Test that owner can call delegateVoting successfully
    // We pass address(0) as a dummy delegate since we're just testing access control
    await expect(cooler.connect(owner).delegateVoting(ethers.ZeroAddress)).to.not.be.reverted;
    
    // Test that non-owner is reverted
    await expect(cooler.connect(addr1).delegateVoting(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      cooler,
      "OnlyApproved"
    );
  });
});