import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 test", function () {
  it("should revert when calling transfer with non-empty _tos array (mutant changes i<_tos.length to i>_tos.length, so loop never executes)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // Mint tokens to owner and approve airPort contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(await airPort.getAddress(), ethers.parseEther("100"));
    
    // Create recipients array with two addresses
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");
    
    // In the original contract, this call should succeed and transfer tokens
    // In the mutant, the loop never executes (i>_tos.length is false from start),
    // so no transfers happen but the function returns true (no revert)
    // We can detect this by checking token balances after the call
    await airPort.transfer(owner.address, await token.getAddress(), recipients, transferAmount);
    
    // Assert that tokens were actually transferred (original behavior)
    // If the mutant is active, balances will remain unchanged
    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("80")); // 100 - 10 - 10
  });
});