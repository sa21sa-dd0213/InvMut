import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection test", function () {
  it("should detect mutant m27db169d by verifying forwarded value equals msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the main contract with some initial balance
    const initialFunding = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding,
    });

    // Deploy a simple receiver contract to track received funds
    const ReceiverFactory = await ethers.getContractFactory("Receiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    const sendAmount = ethers.parseEther("0.5");
    const receiverAddress = await receiver.getAddress();
    const initialReceiverBalance = await ethers.provider.getBalance(receiverAddress);

    // Execute Command with exact amount
    const tx = await instance.connect(owner).Command(
      receiverAddress,
      "0x",
      { value: sendAmount }
    );
    await tx.wait();

    const finalReceiverBalance = await ethers.provider.getBalance(receiverAddress);
    const actualReceived = finalReceiverBalance - initialReceiverBalance;

    // Assert the full msg.value was forwarded (mutant would forward one wei less)
    expect(actualReceived).to.equal(sendAmount);
  });
});