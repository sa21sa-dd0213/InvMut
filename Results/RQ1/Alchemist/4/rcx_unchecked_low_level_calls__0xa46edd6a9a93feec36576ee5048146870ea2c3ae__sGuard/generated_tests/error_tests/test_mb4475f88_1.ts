import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mb4475f88 test", function () {
  it("should detect off-by-one error in loop condition (i <= _tos.length vs i < _tos.length)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to receive transferFrom calls
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: approve the EBU contract to transfer tokens from owner
    const amount = ethers.parseEther("1");
    await token.approve(await instance.getAddress(), amount);
    
    // Create arrays with exactly one recipient
    const recipients = [addr1.address];
    const values = [amount];

    // Call transfer with the EBU contract address as caddress (token)
    const tx = await instance.transfer(owner.address, await token.getAddress(), recipients, values);
    const receipt = await tx.wait();

    // Check that only one transfer happened (balance of addr1 should be exactly amount)
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
    
    // The mutant would make an extra call with zero address and zero value,
    // which would not change balances but would be an unintended side effect.
    // To detect the mutant, we can also check that no transferFrom event was emitted
    // for a zero-address recipient.
    const events = await token.queryFilter(token.filters.Transfer(), receipt.blockNumber, receipt.blockNumber);
    // Only one Transfer event should exist (from owner to addr1)
    expect(events.length).to.equal(1);
    expect(events[0].args.from).to.equal(owner.address);
    expect(events[0].args.to).to.equal(addr1.address);
    expect(events[0].args.value).to.equal(amount);
  });
});