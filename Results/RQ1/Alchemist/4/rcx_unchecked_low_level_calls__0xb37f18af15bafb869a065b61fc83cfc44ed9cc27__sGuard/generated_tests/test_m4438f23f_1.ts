import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m4438f23f test", function () {
  it("should revert when non-owner calls withdraw after the onlyOwner modifier is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdraw has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner tries to withdraw - should revert in original, but not in mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});