import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mc744edec", function () {
  it("should return true from transfer function when called by authorized address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU - no constructor arguments needed based on contract code
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract's 'from' variable
    const authorizedAddress = await instance.from();
    
    // Get the caddress from the contract
    const caddress = await instance.caddress();
    
    // Impersonate the authorized address (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAddress],
    });
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0"),
    });

    // Prepare test inputs - send a small amount to addr1
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("0.001")]; // Will be multiplied by 1e18 in contract
    
    // Call transfer function from authorized address
    const tx = await instance.connect(authorizedSigner).transfer(recipients, amounts);
    const receipt = await tx.wait();
    
    // Check that the function returned true by calling it statically
    const result = await instance.connect(authorizedSigner).transfer.staticCall(recipients, amounts);
    
    // The original returns true, the mutant does not return anything
    expect(result).to.equal(true);
  });
});