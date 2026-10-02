import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mb410feff - requestDeposit modifier removal", function () {
  it("should revert when unauthorized address calls requestDeposit", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.hexlify(ethers.randomBytes(16));
    const assetAddress = ethers.Wallet.createRandom().address;
    const shareAddress = ethers.Wallet.createRandom().address;
    const investmentManagerAddress = ethers.Wallet.createRandom().address;
    
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
    const assets = ethers.parseEther("100");
    const ownerAddress = owner.address;
    
    // This should revert because unauthorized is not the owner (withApproval modifier)
    await expect(
      instance.connect(unauthorized).requestDeposit(assets, ownerAddress)
    ).to.be.reverted;
  });
});