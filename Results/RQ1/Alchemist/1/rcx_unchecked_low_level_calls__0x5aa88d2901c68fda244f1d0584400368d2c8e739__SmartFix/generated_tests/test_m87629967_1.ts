import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect mutant that subtracts 1 from msg.value in Command", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record balance of target address before call
    const targetBefore = await ethers.provider.getBalance(addr1.address);

    // Owner calls Command with exactly 5 ether
    const callValue = ethers.parseEther("5");
    const tx = await instance.connect(owner).Command(
      addr1.address,
      "0x",
      { value: callValue }
    );
    await tx.wait();

    // Check target balance after call
    const targetAfter = await ethers.provider.getBalance(addr1.address);
    const balanceChange = targetAfter - targetBefore;

    // On original: balanceChange should equal callValue (5 ether)
    // On mutant: balanceChange would be callValue - 1 wei, causing assertion to fail
    expect(balanceChange).to.equal(callValue);
  });
});