import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mb1e55086 detection", function () {
  it("should detect the mutant that replaces ** with * in value calculation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Deploy airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const instance = await AirDropFactory.deploy();
    await instance.waitForDeployment();
    
    // Fund addr1 with tokens and approve the airDrop contract to spend them
    const amount = ethers.parseEther("100");
    await token.mint(addr1.address, amount);
    await token.connect(addr1).approve(await instance.getAddress(), ethers.MaxUint256);
    
    // Test case: v=1, _decimals=2 => original: _value = 1 * 10**2 = 100
    // Mutant: _value = 1 * 10 * 2 = 20
    // So the transferFrom call will attempt to transfer 100 tokens (original) vs 20 (mutant)
    // The original should succeed, the mutant will transfer wrong amount
    
    const recipients = [addr2.address];
    const v = 1;
    const decimals = 2;
    
    // Check addr2 balance before
    const balanceBefore = await token.balanceOf(addr2.address);
    
    // Execute the transfer
    const tx = await instance.connect(addr1).transfer(
      addr1.address,
      tokenAddress,
      recipients,
      v,
      decimals
    );
    await tx.wait();
    
    // Check addr2 balance after
    const balanceAfter = await token.balanceOf(addr2.address);
    
    // In original: balanceAfter - balanceBefore should equal 100 tokens
    // In mutant: balanceAfter - balanceBefore should equal 20 tokens
    // We expect the original behavior (100), so if mutant gives 20, the test fails
    const expectedIncrease = BigInt(v) * BigInt(10 ** decimals); // 1 * 100 = 100
    const actualIncrease = balanceAfter - balanceBefore;
    
    expect(actualIncrease).to.equal(expectedIncrease);
  });
});