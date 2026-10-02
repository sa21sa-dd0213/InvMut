import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - m27db169d", function () {
  it("should detect that Command sends msg.value-1 instead of msg.value", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some initial balance (optional, for context)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // Deploy a simple receiver contract to track received ETH
    const ReceiverFactory = await ethers.getContractFactory("contracts/test/Receiver.sol:Receiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();
    const receiverAddress = await receiver.getAddress();

    // Prepare the call data - we'll call a simple function on the receiver
    const data = receiver.interface.encodeFunctionData("receiveFunds");

    // Record receiver balance before
    const balanceBefore = await ethers.provider.getBalance(receiverAddress);

    // Execute Command with exactly 1 ether
    const sentAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(owner).Command(receiverAddress, data, { value: sentAmount });
    await tx.wait();

    // Check receiver balance after - should have received msg.value, not msg.value-1
    const balanceAfter = await ethers.provider.getBalance(receiverAddress);
    const receivedAmount = balanceAfter - balanceBefore;

    // In the original contract, receiver would get exactly sentAmount (1 ether)
    // In the mutant, receiver would get sentAmount - 1 wei (1 ether - 1 wei)
    expect(receivedAmount).to.equal(sentAmount);
  });
});