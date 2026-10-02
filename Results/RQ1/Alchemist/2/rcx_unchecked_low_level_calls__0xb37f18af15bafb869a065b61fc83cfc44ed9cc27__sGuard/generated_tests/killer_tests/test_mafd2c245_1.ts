import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - mafd2c245", function () {
  it("should allow owner to call withdrawAll() and not revert (original behavior), but mutant will revert because != check blocks owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so withdrawAll has balance to transfer
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner attempts to withdrawAll - should succeed in original, fail in mutant
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});