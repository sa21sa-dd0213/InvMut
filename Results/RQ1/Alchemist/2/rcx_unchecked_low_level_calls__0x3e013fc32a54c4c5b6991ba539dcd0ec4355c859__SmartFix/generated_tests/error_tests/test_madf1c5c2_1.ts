import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant madf1c5c2", function () {
  it("should detect the * instead of + in multiplicate require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 wei so balance is non-zero
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1"));

    // Now call multiplicate with msg.value = 0
    // Original: require(balance + 0 >= balance) -> passes
    // Mutant:   require(balance * 0 >= balance) -> require(0 >= balance) -> reverts when balance > 0
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});