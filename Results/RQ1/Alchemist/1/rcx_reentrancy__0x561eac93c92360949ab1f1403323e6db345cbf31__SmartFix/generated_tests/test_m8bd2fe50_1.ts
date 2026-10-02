import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE - mutant m8bd2fe50 (if(true) instead of if(_veri_ok))", function () {
  it("should revert when Collect is called with a contract that rejects ether, but mutant will not revert", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy BANK_SAFE (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy a contract that rejects ether
    const RejectorFactory = await ethers.getContractFactory("contract RejectEther { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Initialize the bank
    await bank.connect(owner).SetMinSum(ethers.parseEther("1"));
    await bank.connect(owner).SetLogFile(await bank.Log());
    await bank.connect(owner).Initialized();
    
    // User deposits 2 ether
    await bank.connect(user).Deposit({ value: ethers.parseEther("2") });
    
    // User tries to Collect 1 ether to the rejecting contract address
    // In original: should revert because call fails (revertor rejects ether)
    // In mutant: will not revert (always considers call successful)
    await expect(
      bank.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});