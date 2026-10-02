import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - m2ff93a39", function () {
  it("should revert when unauthorized user calls burn function", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();

    // Deploy the contract with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const assetAddress = "0x0000000000000000000000000000000000000001";
    const shareAddress = "0x0000000000000000000000000000000000000002";
    const investmentManagerAddress = "0x0000000000000000000000000000000000000003";

    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await instance.waitForDeployment();

    // Attempt to call burn from an unauthorized address and expect revert
    await expect(
      instance.connect(unauthorizedUser).burn(
        unauthorizedUser.address,
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("Auth/not-authorized");
  });
});