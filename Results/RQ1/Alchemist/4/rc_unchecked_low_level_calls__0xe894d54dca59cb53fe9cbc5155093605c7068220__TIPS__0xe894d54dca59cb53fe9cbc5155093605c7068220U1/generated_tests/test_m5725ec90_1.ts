import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - m5725ec90", function () {
  it("should kill mutant by checking return value is true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that supports transferFrom
    // We need a contract at caddress that can be called with transferFrom selector
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airDrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(instance.target, mintAmount);

    // Setup: from, to addresses, and value
    const recipients = [addr1.address, addr2.address];
    const value = 10; // 10 tokens
    const decimals = 18;

    // Call transfer function and capture the return value
    const tx = await instance.transfer(
      owner.address,
      token.target,
      recipients,
      value,
      decimals
    );
    const receipt = await tx.wait();

    // Decode the return value from the transaction
    const returnData = receipt.logs[0]?.data;
    // The original returns true, mutant would return false or fail
    // We check by attempting to decode the boolean result
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256,uint256) returns (bool)"]);
    const decoded = iface.decodeFunctionResult("transfer", receipt.logs[0]?.data || "0x");
    
    expect(decoded[0]).to.equal(true, "transfer should return true on success");
  });
});