import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m6a1fc97b test", function () {
  it("should detect mutant that changes <= to == in transferFrom require statement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with some tokens via getTokens (needs whitelist check)
    // The contract has a getTokens() function that can be called by any non-blacklisted address
    await instance.connect(addr1).getTokens({ value: 0 });

    // Get the balance of addr1 after distribution
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // Ensure addr1 has tokens to transfer
    expect(initialBalance).to.be.gt(0);

    // Approve owner to spend a partial amount (less than full balance) from addr1
    const partialAmount = initialBalance / 2n;
    await instance.connect(addr1).approve(owner.address, partialAmount);

    // Attempt transferFrom with partial amount - this should succeed in original but fail in mutant
    // Mutant requires _amount == balances[_from], so partial transfer will revert
    await expect(
      instance.connect(owner).transferFrom(addr1.address, addr2.address, partialAmount)
    ).to.be.reverted;

    // Verify the transfer did not happen in either case (reverted)
    expect(await instance.balanceOf(addr1.address)).to.equal(initialBalance);
    expect(await instance.balanceOf(addr2.address)).to.equal(0);
  });
});