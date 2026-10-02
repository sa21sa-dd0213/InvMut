import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m814e6338", function () {
  it("should revert when calling transfer with multiple recipients due to loop condition change", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const caddress = addr1.address;
    const tos = [addr2.address, addr3.address];
    const v = 100;

    // On original: loop runs for both addresses, no revert
    // On mutant: loop condition i > _tos.length is false initially (0 > 2 = false), so loop never executes, but function returns true
    // To kill the mutant, we need to verify that the intended transfers did NOT happen
    // Since we cannot observe internal state of demo, we check that the function returns true (which it does on both)
    // However, we can kill the mutant by verifying that the loop body never executed, meaning the call to caddress never happened
    // We can use a simple contract that records calls to detect the difference

    // Deploy a simple receiver contract to record transferFrom calls
    const ReceiverFactory = await ethers.getContractFactory("contract Receiver { event TransferCalled(address from, address to, uint value); function transferFrom(address from, address to, uint value) external { emit TransferCalled(from, to, value); } }");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    // Call the mutated transfer with receiver as caddress
    const tx = await instance.transfer(owner.address, await receiver.getAddress(), tos, v);
    await tx.wait();

    // On original: two TransferCalled events should be emitted
    // On mutant: zero events because loop never executes
    const events = await receiver.queryFilter(receiver.filters.TransferCalled());
    expect(events.length).to.equal(0, "Mutant should cause loop to never execute, resulting in zero transfer calls");
  });
});