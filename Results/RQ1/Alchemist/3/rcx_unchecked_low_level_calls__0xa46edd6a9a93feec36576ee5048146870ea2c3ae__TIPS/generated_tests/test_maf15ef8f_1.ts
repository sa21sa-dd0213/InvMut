import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test", function () {
  it("should return true on successful transfer, killing mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("EBU");
    // Use a minimal token that supports transferFrom
    const token = await ethers.deployContract("ERC20Mock", ["Test", "TST", 18]);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the EBU contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(instance.target, ethers.parseEther("10"));

    // Prepare transfer parameters
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];

    // Call the transfer function (which internally calls transferFrom)
    const tx = await instance.transfer(owner.address, token.target, tos, values);
    const receipt = await tx.wait();

    // The mutant removes 'return true', so the transaction should succeed
    // but the return value should be false (default) instead of true
    // We check the return value by decoding the transaction result
    const result = await instance.callStatic.transfer(owner.address, token.target, tos, values);
    
    // On the original, this returns true; on the mutant, it returns false
    // So asserting it returns true will fail on the mutant (killing it)
    expect(result).to.equal(true);
  });
});