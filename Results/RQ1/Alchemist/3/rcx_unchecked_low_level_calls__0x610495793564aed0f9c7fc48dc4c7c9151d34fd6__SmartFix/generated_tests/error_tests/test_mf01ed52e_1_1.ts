import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - onlyOwner modifier", function () {
  it("should revert when non-owner calls withdrawAll after removing require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract so withdrawAll has balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // addr1 is not the owner, calling withdrawAll should revert due to onlyOwner modifier
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});