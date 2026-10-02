import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - RedeemRequested event", function () {
  it("should emit RedeemRequested event when requestRedeem is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const asset = addr1.address; // placeholder address for asset token
    const share = addr1.address; // placeholder address for share token
    const investmentManager = addr1.address; // placeholder address for investment manager
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(poolId, trancheId, asset, share, investmentManager);
    await instance.waitForDeployment();
    
    // Authorize addr1 to call requestRedeem by setting wards
    await instance.connect(owner).rely(addr1.address);
    
    // Prepare test parameters
    const shares = ethers.parseEther("100");
    const ownerAddress = addr1.address;
    
    // Call requestRedeem and check for event emission
    await expect(instance.connect(addr1).requestRedeem(shares, ownerAddress))
      .to.emit(instance, "RedeemRequested")
      .withArgs(ownerAddress, shares);
  });
});