import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant me5a1143f", function () {
  it("should kill the mutant by verifying the exact msg.value is forwarded in Command call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Deploy a simple recipient contract to capture the forwarded value
    const RecipientFactory = await ethers.getContractFactory("TestRecipient");
    const recipient = await RecipientFactory.deploy();
    await recipient.waitForDeployment();
    const recipientAddress = await recipient.getAddress();

    // Fund the MultiplicatorX4 contract with some initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // Call Command with exactly 1 ether
    const callData = recipient.interface.encodeFunctionData("receiveFunds");
    const tx = await instance.connect(owner).Command(
      recipientAddress,
      callData,
      { value: ethers.parseEther("1.0") }
    );
    await tx.wait();

    // Check the recipient's balance - it should be exactly 1 ether (not 1 ether + 1 wei)
    const recipientBalance = await ethers.provider.getBalance(recipientAddress);
    expect(recipientBalance).to.equal(ethers.parseEther("1.0"));
  });
});