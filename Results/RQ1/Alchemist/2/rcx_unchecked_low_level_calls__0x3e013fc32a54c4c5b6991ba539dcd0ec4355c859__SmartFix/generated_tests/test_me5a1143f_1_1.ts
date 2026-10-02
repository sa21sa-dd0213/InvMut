import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - msg.value+1", function () {
  it("should detect that Command sends msg.value+1 instead of msg.value", async function () {
    const [owner, attacker, receiver] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so it can send value
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialReceiverBalance = await ethers.provider.getBalance(receiver.address);
    const sendAmount = ethers.parseEther("0.5");

    // Execute Command with exact msg.value
    await instance.connect(owner).Command(
      receiver.address,
      "0x",
      { value: sendAmount }
    );

    const finalReceiverBalance = await ethers.provider.getBalance(receiver.address);
    const receivedAmount = finalReceiverBalance - initialReceiverBalance;

    // Original would send exactly sendAmount; mutant sends sendAmount + 1 wei
    // Therefore we expect the received amount to be sendAmount (original behavior)
    expect(receivedAmount).to.equal(sendAmount);
  });
});