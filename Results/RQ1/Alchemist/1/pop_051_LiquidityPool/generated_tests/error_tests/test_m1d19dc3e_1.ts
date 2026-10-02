import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m1d19dc3e test", function () {
  it("should revert when file is called with an unrecognized parameter", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with dummy constructor arguments (these need to be valid addresses/values)
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test");
    const asset = "0x0000000000000000000000000000000000000001";
    const share = "0x0000000000000000000000000000000000000002";
    const investmentManager = "0x0000000000000000000000000000000000000003";
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(poolId, trancheId, asset, share, investmentManager);
    await instance.waitForDeployment();

    // Attempt to call file() with an unrecognized parameter
    // The original contract reverts, but the mutant might not
    await expect(
      instance.connect(owner).file(ethers.encodeBytes32String("invalidParam"), owner.address)
    ).to.be.revertedWith("LiquidityPool/file-unrecognized-param");
  });
});