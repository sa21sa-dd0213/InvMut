import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant ma4a74363 detection", function () {
  it("should detect when target is changed to address(this) by checking owner balance after external call", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for B)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a helper contract that will receive funds at the external address
    const ReceiverFactory = await ethers.getContractFactory(
      "contract Receiver { fallback() external payable {} function getBalance() public view returns (uint) { return address(this).balance; } }"
    );
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    // Get initial owner balance
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");

    // Send ether to the contract
    const sendTx = await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });
    await sendTx.wait();

    // Call go() on the original contract - this should send ether to the hardcoded address first
    const goTx = await instance.connect(owner).go({ value: 0 });
    await goTx.wait();

    // Check owner balance after go() call
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const ownerReceived = ownerBalanceAfter - initialOwnerBalance;

    // In the original contract, some ether is sent to the external address first,
    // so owner should receive LESS than the full amount
    expect(ownerReceived).to.be.lessThan(sendAmount);
  });
});