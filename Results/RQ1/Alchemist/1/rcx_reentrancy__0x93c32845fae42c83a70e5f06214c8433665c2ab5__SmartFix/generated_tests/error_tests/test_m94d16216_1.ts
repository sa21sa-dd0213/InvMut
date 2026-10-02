import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m94d16216 test", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy X_WALLET with Log contract address as constructor argument
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logContract.getAddress());
    await instance.waitForDeployment();
    
    // Call Put with exactly 1 ether from addr1
    const putAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();
    
    // Check the Log contract's History array for the last entry
    // In the original contract, Val should be exactly 1 ether
    // In the mutant, Val would be 1 ether + 1 wei
    const lastEntryIndex = (await logContract.History.length()) - BigInt(1);
    const lastMessage = await logContract.History(lastEntryIndex);
    
    // Verify the logged value equals the actual amount sent (not amount+1)
    expect(lastMessage.Val).to.equal(putAmount);
  });
});