import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - remove auth modifier from mint", function () {
  it("should revert when unauthorized user calls mint (mutant removes auth modifier)", async function () {
    const [owner, unauthorizedUser, addr1] = await ethers.getSigners();
    
    // Deploy with required constructor arguments (poolId, trancheId, asset, share, investmentManager)
    // Using dummy addresses for asset, share, and investmentManager since we're testing access control
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const dummyAddress = "0x0000000000000000000000000000000000000001";
    const instance = await Factory.deploy(poolId, trancheId, dummyAddress, dummyAddress, dummyAddress);
    await instance.waitForDeployment();

    // Attempt to call mint from an unauthorized address (not the owner)
    // The mint function signature is mint(address, uint256)
    await expect(
      instance.connect(unauthorizedUser).mint(addr1.address, ethers.parseEther("100"))
    ).to.be.revertedWith("Auth/not-authorized");
  });
});