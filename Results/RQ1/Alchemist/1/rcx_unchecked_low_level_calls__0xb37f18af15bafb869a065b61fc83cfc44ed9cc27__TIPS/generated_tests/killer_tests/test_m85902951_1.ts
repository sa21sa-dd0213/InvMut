import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to withdrawAll and kill the mutant that flips onlyOwner to require msg.sender != owner", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should succeed in original, revert in mutant
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});