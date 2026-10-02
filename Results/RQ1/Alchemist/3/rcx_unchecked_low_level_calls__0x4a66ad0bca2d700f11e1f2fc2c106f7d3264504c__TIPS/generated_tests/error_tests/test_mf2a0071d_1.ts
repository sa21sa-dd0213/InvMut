import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mf2a0071d", function () {
  it("should detect mutant that replaces caddress with from address by verifying token transfer fails", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token contract that the original caddress points to
    // We need to deploy a mock token at the original caddress to simulate the real scenario
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy("Test", "TST", 18);
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    
    // Deploy EBU contract - note: the mutant has caddress = from address (0x979...)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();
    
    // Fund the owner account with test tokens
    const amount = ethers.parseEther("100");
    await mockToken.mint(owner.address, amount);
    
    // Approve EBU contract to spend tokens on behalf of owner
    await mockToken.approve(instanceAddress, amount);
    
    // Prepare transfer parameters
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("1")];
    
    // Check balances before
    const balanceBeforeOwner = await mockToken.balanceOf(owner.address);
    const balanceBeforeAddr1 = await mockToken.balanceOf(addr1.address);
    
    // Call transfer - this will call caddress.call() with transferFrom
    // In the mutant, caddress = from address (owner), which is an EOA, not the token contract
    await instance.connect(owner).transfer(recipients, amounts);
    
    // Check balances after - in the mutant, no actual transfer happened because
    // the call went to the EOA (owner) instead of the token contract
    const balanceAfterOwner = await mockToken.balanceOf(owner.address);
    const balanceAfterAddr1 = await mockToken.balanceOf(addr1.address);
    
    // The mutant should fail this assertion because no tokens were transferred
    expect(balanceAfterOwner).to.equal(balanceBeforeOwner.sub(ethers.parseEther("1")));
    expect(balanceAfterAddr1).to.equal(balanceBeforeAddr1.add(ethers.parseEther("1")));
  });
});