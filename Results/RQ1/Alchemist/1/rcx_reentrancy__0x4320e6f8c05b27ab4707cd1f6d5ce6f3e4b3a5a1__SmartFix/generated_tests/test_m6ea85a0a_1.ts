import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m6ea85a0a test", function () {
  it("should revert when Collect fails to send ether to a rejecting contract", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the ACCURAL_DEPOSIT contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that rejects ether
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    const rejectorAddress = await rejector.getAddress();
    const instanceAddress = await instance.getAddress();
    
    // Send ether to user so they have balance
    await owner.sendTransaction({
      to: rejectorAddress,
      value: ethers.parseEther("10")
    });
    
    // User deposits ether into ACCURAL_DEPOSIT
    await instance.connect(user).Deposit({ value: ethers.parseEther("5") });
    
    // Set MinSum to allow withdrawal
    await instance.SetMinSum(ethers.parseEther("1"));
    
    // Initialize the contract
    await instance.Initialized();
    
    // Verify balance
    expect(await instance.balances(user.address)).to.equal(ethers.parseEther("5"));
    
    // Now try to collect from the rejecting contract address
    // In original contract this should revert, in mutant it would succeed (wrongly)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("3"))
    ).to.be.reverted;
  });
});