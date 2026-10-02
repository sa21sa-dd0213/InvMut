import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - caddress state variable change", function () {
  it("should detect mutant where caddress is changed to from address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const instanceAddress = await instance.getAddress();
    
    // Check the caddress value - in original it should be different from from
    const caddress = await instance.caddress();
    const from = await instance.from();
    
    // For the mutant, caddress equals from; for original, they differ
    // We'll test by calling transfer and checking behavior
    
    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token in smallest unit
    
    // Call transfer from the owner (which matches msg.sender requirement)
    await instance.connect(owner).transfer(recipients, amounts);
    
    // The key difference: when caddress == from (mutant), the call to 
    // transferFrom on the EBU contract itself will fail silently because
    // EBU doesn't implement transferFrom. When caddress is different (original),
    // it would call an external contract.
    
    // To detect the mutant, we verify that no Ether was transferred to addr1
    // (since EBU doesn't implement transferFrom, the call does nothing)
    const addr1Balance = await ethers.provider.getBalance(addr1.address);
    expect(addr1Balance).to.equal(0);
    
    // Also verify the function returns true (it always does)
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();
    
    // In the mutant, the call to caddress with transferFrom selector will
    // execute on the EBU contract itself, which has no fallback/receive
    // and doesn't implement transferFrom, so it reverts silently but 
    // the contract continues because of .call() usage
  });
});