import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m825aecd2", function () {
  it("should revert when non-owner calls withdrawAll (detects missing onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll has balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner (addr1) tries to call withdrawAll - should revert in original, but mutant will allow it
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});