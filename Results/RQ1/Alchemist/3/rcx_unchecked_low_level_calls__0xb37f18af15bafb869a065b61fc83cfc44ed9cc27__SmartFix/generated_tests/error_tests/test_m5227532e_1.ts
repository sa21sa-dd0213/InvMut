import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant m5227532e (sendMoney without onlyOwner)", function () {
  it("should revert when non-owner tries to call sendMoney", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether so sendMoney has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from a non-owner address - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).sendMoney(addr1.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});