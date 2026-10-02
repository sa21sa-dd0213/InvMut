import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should detect mutant that changes * to + in _value calculation", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: mint tokens to 'from' and approve airDrop contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), ethers.MaxUint256);
    
    // Parameters: v=1, decimals=2 => original _value = 1 * 10^2 = 100, mutant _value = 1 + 10^2 = 11
    const v = 1;
    const decimals = 2;
    const expectedValue = BigInt(100); // original multiplication result
    
    // Get initial balance of recipient
    const initialBalance = await token.balanceOf(recipient.address);
    
    // Call the transfer function
    const recipients = [recipient.address];
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );
    await tx.wait();
    
    // Check recipient balance increased by exactly 100 (original behavior)
    const finalBalance = await token.balanceOf(recipient.address);
    expect(finalBalance - initialBalance).to.equal(expectedValue);
  });
});