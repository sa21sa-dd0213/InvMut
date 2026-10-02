import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant m7830eff2", function () {
  it("should allow transferFrom with exact balance (kill mutant with < operator)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens to addr1 using the getTokens function
    // Send ether to trigger getTokens and distribute initial tokens
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get the balance of addr1 after distribution
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    
    // Owner approves addr1 to spend tokens on behalf of owner
    // First get owner's balance
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Owner approves addr1 to spend all their tokens
    await instance.approve(addr1.address, ownerBalance);

    // Now addr1 transfers the exact full balance of owner to addr2
    // This should succeed in original (<=) but fail in mutant (<)
    await expect(
      instance.connect(addr1).transferFrom(
        owner.address,
        addr2.address,
        ownerBalance
      )
    ).to.not.be.reverted;

    // Verify the transfer happened correctly
    const finalBalanceOwner = await instance.balanceOf(owner.address);
    expect(finalBalanceOwner).to.equal(0);
    
    const finalBalanceAddr2 = await instance.balanceOf(addr2.address);
    expect(finalBalanceAddr2).to.equal(ownerBalance);
  });
});