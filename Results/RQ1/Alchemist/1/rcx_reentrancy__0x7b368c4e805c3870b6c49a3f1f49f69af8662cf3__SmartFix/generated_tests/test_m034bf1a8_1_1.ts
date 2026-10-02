import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m034bf1a8 test", function () {
  it("should detect mutant by calling Put with msg.value=0 when balance is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Ensure addr1 has zero balance in the contract (fresh account)
    // Call Put with 0 ether - original allows it, mutant reverts
    const tx = instance.connect(addr1).Put(0, { value: 0 });
    
    // The mutant should revert because (0 + 0 - 1 >= 0) is false
    // The original would succeed (the check is always true)
    await expect(tx).to.be.reverted;
  });
});