import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mf01ed52e", function () {
  it("should revert when non-owner calls withdrawAll() (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Non-owner tries to call withdrawAll - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});