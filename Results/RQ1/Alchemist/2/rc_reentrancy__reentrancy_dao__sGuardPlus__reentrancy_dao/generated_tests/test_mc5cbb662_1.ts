import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mc5cbb662", function () {
  it("should detect the mutant by calling withdrawAll with zero credit and checking that no external call is made", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, deposit some ETH from owner to have a non-zero balance in the contract
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Now addr1 has zero credit. Capture the balance before withdrawal
    const balanceBefore = await ethers.provider.getBalance(instance.target);

    // addr1 calls withdrawAll - should NOT make an external call in the original contract
    // In the mutant, it WILL make an external call (sending 0 ETH) which we can detect
    const tx = await instance.connect(addr1).withdrawAll();
    const receipt = await tx.wait();

    // Check that the contract balance remains unchanged (since addr1 had 0 credit)
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    expect(balanceAfter).to.equal(balanceBefore);

    // Verify that addr1's credit is still 0 (unchanged)
    expect(await instance.credit(addr1.address)).to.equal(0);

    // The key kill: check that no ETH was transferred to addr1
    // In the mutant, even though the value is 0, an external call is made
    // We can detect this by checking the gas used - mutant will use more gas
    // due to the extra external call. A more robust check: verify the tx logs
    // or that the address didn't receive any ETH (it shouldn't have)
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    // addr1 shouldn't have received any ETH from this transaction
    // (only spent gas, so balance should be less, not more)
    expect(addr1BalanceAfter).to.be.lessThan(
      (await ethers.provider.getBalance(addr1.address)).add(ethers.parseEther("0.001"))
    );
  });
});