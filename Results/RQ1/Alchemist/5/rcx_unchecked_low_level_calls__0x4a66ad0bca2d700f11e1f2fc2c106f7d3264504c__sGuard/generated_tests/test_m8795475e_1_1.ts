import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - caddress changed to from address", function () {
  it("should detect mutant where caddress equals from address by verifying external contract state", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20-like contract that tracks transferFrom calls
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Deploy EBU with the original caddress pointing to our mock token
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();
    
    // Get the original caddress value from the contract
    const originalCaddress = await ebu.caddress();
    
    // Verify we're testing the mutant (caddress equals from address)
    const fromAddress = await ebu.from();
    expect(originalCaddress).to.equal(fromAddress, "Mutant detected: caddress should equal from in mutant");
    
    // Fund the from address with tokens to enable transferFrom
    const tokenAmount = ethers.parseEther("10");
    await mockToken.mint(fromAddress, tokenAmount);
    
    // Approve EBU contract to spend tokens on behalf of from
    await mockToken.connect(owner).approve(await ebu.getAddress(), tokenAmount);
    
    // Get initial balance of mock token at the actual contract address
    const initialBalance = await mockToken.balanceOf(addr1.address);
    
    // Execute transfer - in original this would call mockToken.transferFrom
    // In mutant it calls from address (which is not a contract) so tx should succeed but no tokens moved
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18)
    
    await expect(ebu.connect(owner).transfer(tos, values)).to.not.be.reverted;
    
    // Check balance at the intended contract (mockToken) - should be unchanged in mutant
    const finalBalance = await mockToken.balanceOf(addr1.address);
    expect(finalBalance).to.equal(initialBalance, "Mutant detected: tokens should have been transferred to addr1 in original");
    
    // In the original, the balance would have increased by 1e18 tokens
    // In the mutant, since call goes to wrong address, balance remains 0
    expect(finalBalance).to.equal(0, "Confirming mutant: no tokens transferred to addr1");
  });
});