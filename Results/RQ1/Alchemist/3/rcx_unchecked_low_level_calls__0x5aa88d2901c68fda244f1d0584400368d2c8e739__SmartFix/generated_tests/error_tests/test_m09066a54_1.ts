import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test m09066a54", function () {
  it("should kill mutant by calling multiplicate with msg.value equal to contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(instanceAddress);
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value = 1 ether (equal to contract balance)
    // Original: transfers 1 + 1 = 2 ether
    // Mutant: tries to transfer 1 * 1 = 1 ether^2 which will overflow/revert
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });

    // The mutant should revert because multiplication result is astronomically large
    await expect(tx).to.be.reverted;
  });
});