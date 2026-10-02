import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should return true when transfer is successful", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like contract to use as caddress
    const ERC20Factory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Transfer some tokens to owner so they can be transferred via transferFrom
    await token.transfer(owner.address, ethers.parseEther("100"));
    
    // Approve the airPort contract to spend tokens on behalf of owner
    await token.approve(instance.target, ethers.parseEther("100"));

    // Create recipients array
    const recipients = [addr1.address];

    // Call transfer function and capture the return value
    const tx = await instance.transfer(
      owner.address,
      token.target,
      recipients,
      ethers.parseEther("10")
    );
    const receipt = await tx.wait();

    // The return value should be true (mutant returns false, killing it)
    // We need to decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256) returns (bool)"]);
    const decoded = iface.decodeFunctionResult("transfer", receipt.logs[0].data);
    expect(decoded[0]).to.equal(true);
  });
});