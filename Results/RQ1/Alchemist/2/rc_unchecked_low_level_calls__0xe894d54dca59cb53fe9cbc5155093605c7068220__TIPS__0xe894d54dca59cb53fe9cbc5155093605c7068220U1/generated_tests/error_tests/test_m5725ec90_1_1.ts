import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is successful on original, but false on mutant that removed return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy SimpleToken first since airDrop may reference it
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with some tokens to transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);

    // Approve the airDrop contract to transfer from addr1
    await token.connect(addr1).approve(await instance.getAddress(), mintAmount);

    // Prepare test parameters
    const recipients = [addr2.address];
    const transferValue = ethers.parseEther("10");
    const decimals = 18;

    // Call the transfer function and capture the return value
    const tx = await instance.transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      transferValue,
      decimals
    );
    const receipt = await tx.wait();

    // Decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256,uint256) returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", tx.data);
    const returnValue = decodedData[0];

    // The original should return true, the mutant (without return true) should return false
    expect(returnValue).to.equal(true);
  });
});