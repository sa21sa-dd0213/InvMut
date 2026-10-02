import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m260de8c9 test", function () {
  it("should detect mutant that changes >= to <= in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Send 5 ether to the bank via fallback (calls Put with unlockTime=0)
    // This sets user's balance to 5 ether and unlockTime to current block timestamp
    await user.sendTransaction({
      to: bankAddress,
      value: ethers.parseEther("5")
    });

    // Verify user balance is 5 ether
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("5"));

    // Now try to collect 3 ether (less than balance)
    // Original contract: acc.balance >= _am → 5 >= 3 → true → should succeed
    // Mutant: acc.balance <= _am → 5 <= 3 → false → will revert

    // Check MinSum is 1 ether, and user balance >= MinSum (5 >= 1)
    // Check block.timestamp > unlockTime (current time > 0) 
    // All conditions should pass in original, but mutant's second condition will fail

    await expect(
      bank.connect(user).Collect(ethers.parseEther("3"))
    ).to.not.be.reverted;

    // Verify the balance decreased by 3 ether
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(ethers.parseEther("2"));
  });
});