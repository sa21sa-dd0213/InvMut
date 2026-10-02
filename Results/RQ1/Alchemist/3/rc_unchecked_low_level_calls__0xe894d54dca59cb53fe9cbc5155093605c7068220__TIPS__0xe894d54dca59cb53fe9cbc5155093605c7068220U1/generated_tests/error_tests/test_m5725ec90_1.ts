import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true on successful transfer and kill mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for airDrop)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to owner and approve the airDrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);
    
    // Prepare test parameters
    const recipients = [addr1.address, addr2.address];
    const amount = ethers.parseEther("10");
    const decimals = 18;
    
    // Call transfer function and check return value
    const tx = await instance.transfer(owner.address, await token.getAddress(), recipients, amount, decimals);
    const receipt = await tx.wait();
    
    // The original returns true, mutant returns false (default)
    // We can check the return value from the transaction
    const returnValue = await instance.transfer.staticCall(
      owner.address,
      await token.getAddress(),
      recipients,
      amount,
      decimals
    );
    
    expect(returnValue).to.equal(true);
  });
});