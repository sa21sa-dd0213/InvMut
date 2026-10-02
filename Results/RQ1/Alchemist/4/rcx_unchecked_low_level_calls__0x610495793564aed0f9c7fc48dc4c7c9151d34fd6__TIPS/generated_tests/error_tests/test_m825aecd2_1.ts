import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should revert when non-owner calls withdrawAll (kills mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from non-owner address - should revert in original
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // revert without specific message due to onlyOwner modifier
  });
});