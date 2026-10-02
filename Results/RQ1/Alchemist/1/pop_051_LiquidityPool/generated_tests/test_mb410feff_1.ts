import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mb410feff - requestDeposit modifier removal", function () {
  it("should revert when unauthorized address calls requestDeposit", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy LiquidityPool with required constructor arguments
    // Note: These are placeholder values - adjust based on actual deployment parameters
    const poolId = 1;
    const trancheId = ethers.hexlify(ethers.randomBytes(16));
    const assetAddress = ethers.Wallet.createRandom().address; // Placeholder for actual asset token
    const shareAddress = ethers.Wallet.createRandom().address; // Placeholder for actual share token
    const investmentManagerAddress = ethers.Wallet.createRandom().address; // Placeholder
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await instance.waitForDeployment();
    
    // Attempt to call requestDeposit from unauthorized address
    // The original contract would revert due to withApproval modifier
    // The mutant without the modifier would allow the call to proceed
    const assets = ethers.parseEther("100");
    const ownerAddress = owner.address;
    
    // This should revert in the original contract because unauthorized is not the owner
    await expect(
      instance.connect(unauthorized).requestDeposit(assets, ownerAddress)
    ).to.be.reverted;
  });
});