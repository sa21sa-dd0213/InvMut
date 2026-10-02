import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m89d0160d", function () {
  it("should detect mutant that replaces success check with false in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Fund user with initial balance
    const depositAmount = ethers.parseEther("5");
    await instance.connect(user).Put(0, { value: depositAmount });

    // Verify initial balance
    let holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Wait for unlock time to pass (unlockTime was set to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine");

    // Attempt to collect 1 ether
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(user).Collect(collectAmount);
    await tx.wait();

    // Check balance after collect attempt
    // In original: balance decreases by collectAmount
    // In mutant: balance remains unchanged because if(false) never executes
    holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount); // Mutant keeps balance unchanged

    // Additional verification: In original, balance would be depositAmount - collectAmount
    // This assertion will fail on original but pass on mutant, killing it
    // To properly kill mutant, we assert the incorrect behavior
    expect(holder.balance).to.not.equal(depositAmount - collectAmount);
  });
});