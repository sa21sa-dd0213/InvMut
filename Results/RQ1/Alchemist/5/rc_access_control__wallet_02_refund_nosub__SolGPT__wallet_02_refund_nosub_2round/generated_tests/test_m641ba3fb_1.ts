import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m641ba3fb - migrateTo access control", function () {
  it("should revert when non-creator calls migrateTo (original behavior), but mutant allows it", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH
    const depositAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Verify contract has balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(depositAmount);
    
    // Attempt to call migrateTo from an unauthorized address (attacker)
    // Original: should revert because require(creator == msg.sender) fails
    // Mutant: should succeed (no access control) and drain contract to recipient
    await expect(
      instance.connect(attacker).migrateTo(recipient.address)
    ).to.be.reverted;
    
    // Verify contract balance remains untouched if reverted
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(depositAmount);
  });
});