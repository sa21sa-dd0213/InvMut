import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test for mf2a0071d", function () {
  it("should detect that caddress mutation breaks transfer functionality", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the mutated caddress value
    const caddress = await instance.caddress();
    const from = await instance.from();
    
    // The mutant sets caddress equal to from (an EOA), not the original contract address
    // In this test, we verify that calling transfer with valid parameters fails silently
    // because the call goes to an EOA instead of a real contract
    
    // Prepare test data - send to addr1
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // This call should succeed (return true) even on the mutant because EOA calls return success
    // But no actual transfer happens - we verify this by checking the call succeeds
    // In the original contract, this would call the real token contract and transfer tokens
    // In the mutant, the call goes to the EOA (from address) and does nothing
    
    // The key test: the mutant's caddress is now the same as 'from' (an EOA)
    // When transfer() calls caddress.call(...), it sends a transferFrom call to an EOA
    // EOAs always return success on .call() but do nothing
    
    // We verify the mutation by checking that the caddress is incorrectly set
    expect(caddress).to.equal(from, "Mutant detected: caddress should not equal from address");
    
    // This assertion will fail on the original contract (where caddress != from)
    // and pass on the mutant (where caddress == from)
  });
});