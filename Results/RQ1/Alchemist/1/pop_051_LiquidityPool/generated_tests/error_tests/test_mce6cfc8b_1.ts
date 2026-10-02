import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mce6cfc8b - decreaseRedeemRequest authorization", function () {
  it("should revert when unauthorized address calls decreaseRedeemRequest", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with required constructor arguments (adjust as needed based on actual constructor)
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const assetAddress = "0x0000000000000000000000000000000000000001"; // placeholder
    const shareAddress = "0x0000000000000000000000000000000000000002"; // placeholder
    const investmentManagerAddress = "0x0000000000000000000000000000000000000003"; // placeholder
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await instance.waitForDeployment();

    // Attempt to call decreaseRedeemRequest from an unauthorized address (addr1)
    // The owner parameter is set to addr2, so msg.sender (addr1) != owner (addr2)
    await expect(
      instance.connect(addr1).decreaseRedeemRequest(100, addr2.address)
    ).to.be.reverted;
  });
});